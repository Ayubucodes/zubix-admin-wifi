import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Badge, Button, Card, Field, Input, PageHeader, Select, TableSkeleton, Textarea, EmptyState, Skeleton } from "../components/ui";
import { ApiError, apiFetch } from "../lib/api";
import { formatDateTime, formatTzs } from "../lib/format";
import { useAuth } from "../features/auth/AuthContext";
import type { LocationDto, PackageDto, PagedResult } from "../types/api";

const PAGE_SIZE = 20;
const DURATION_UNITS = ["MINUTE", "HOUR", "DAY", "WEEK", "MONTH"] as const;

const optionalNumber = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d+$/.test(value), "Enter a whole number");

const packageFormSchema = z.object({
  name: z.string().trim().min(2, "At least 2 characters").max(80),
  description: z.string().trim().max(500).optional(),
  durationValue: z.string().regex(/^[1-9]\d*$/, "Enter a whole number above zero"),
  durationUnit: z.enum(DURATION_UNITS),
  priceTzs: z.string().regex(/^\d+$/, "Enter the price in whole TZS"),
  maxDevices: z.string().regex(/^([1-9]|1\d|20)$/, "Between 1 and 20"),
  dataLimitMb: optionalNumber,
  downloadKbps: optionalNumber,
  uploadKbps: optionalNumber,
  isActive: z.boolean(),
  locationIds: z.array(z.string()),
});
type PackageFormValues = z.infer<typeof packageFormSchema>;

const emptyValues: PackageFormValues = {
  name: "",
  description: "",
  durationValue: "1",
  durationUnit: "HOUR",
  priceTzs: "",
  maxDevices: "1",
  dataLimitMb: "",
  downloadKbps: "",
  uploadKbps: "",
  isActive: true,
  locationIds: [],
};

function toPayload(values: PackageFormValues) {
  const optional = (value: string | undefined) => (value && value !== "" ? Number(value) : null);
  return {
    name: values.name,
    description: values.description ? values.description : null,
    durationValue: Number(values.durationValue),
    durationUnit: values.durationUnit,
    priceTzs: Number(values.priceTzs),
    maxDevices: Number(values.maxDevices),
    dataLimitMb: optional(values.dataLimitMb),
    downloadKbps: optional(values.downloadKbps),
    uploadKbps: optional(values.uploadKbps),
    isActive: values.isActive,
    locationIds: values.locationIds,
  };
}

function toFormValues(pkg: PackageDto): PackageFormValues {
  return {
    name: pkg.name,
    description: pkg.description ?? "",
    durationValue: String(pkg.durationValue),
    durationUnit: pkg.durationUnit,
    priceTzs: String(pkg.priceTzs),
    maxDevices: String(pkg.maxDevices),
    dataLimitMb: pkg.dataLimitMb?.toString() ?? "",
    downloadKbps: pkg.downloadKbps?.toString() ?? "",
    uploadKbps: pkg.uploadKbps?.toString() ?? "",
    isActive: pkg.isActive,
    locationIds: pkg.locationIds,
  };
}

export function PackagesPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("packages:manage");
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [editing, setEditing] = useState<PackageDto | "new" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["packages", { page, search, includeArchived }],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        includeArchived: String(includeArchived),
      });
      if (search.trim()) params.set("search", search.trim());
      return apiFetch<PagedResult<PackageDto>>(`/packages?${params.toString()}`);
    },
  });

  const locationsQuery = useQuery({
    queryKey: ["locations"],
    queryFn: () => apiFetch<PagedResult<LocationDto>>("/locations?pageSize=100"),
    enabled: hasPermission("locations:read"),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/packages/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setNotice("Package archived. Existing payments and subscriptions keep their history.");
      void queryClient.invalidateQueries({ queryKey: ["packages"] });
    },
    onError: (error: Error) => setNotice(error.message),
  });

  const totalPages = Math.max(1, Math.ceil((listQuery.data?.total ?? 0) / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Packages"
        description="Internet packages sold on the captive portal and through vouchers."
        actions={
          canManage && (
            <Button onClick={() => setEditing("new")} disabled={editing !== null}>
              New package
            </Button>
          )
        }
      />

      {notice && <Alert tone="info">{notice}</Alert>}

      {editing && (
        <PackageForm
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? null : editing}
          locations={locationsQuery.data?.items ?? []}
          locationsLoading={locationsQuery.isLoading}
          onDone={(message) => {
            setEditing(null);
            setNotice(message);
            void queryClient.invalidateQueries({ queryKey: ["packages"] });
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      <Card
        title="All packages"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Input
              aria-label="Search packages"
              placeholder="Search by name"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="w-48"
            />
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                className="size-4 accent-brand-700"
                checked={includeArchived}
                onChange={(event) => {
                  setIncludeArchived(event.target.checked);
                  setPage(1);
                }}
              />
              Show archived
            </label>
          </div>
        }
      >
        {listQuery.isPending && <TableSkeleton columns={canManage ? 7 : 6} label="Loading packages" />}
        {listQuery.isError && <Alert>{listQuery.error.message}</Alert>}
        {listQuery.data && listQuery.data.items.length === 0 && (
          <EmptyState title="No packages yet" description={canManage ? "Create your first package to start selling internet access." : undefined} />
        )}
        {listQuery.data && listQuery.data.items.length > 0 && (
          <>
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-y border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-5 py-2.5 font-medium">Name</th>
                    <th className="px-3 py-2.5 font-medium">Duration</th>
                    <th className="px-3 py-2.5 font-medium">Price</th>
                    <th className="px-3 py-2.5 font-medium">Devices</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 font-medium">Updated</th>
                    {canManage && <th className="px-5 py-2.5 text-right font-medium">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {listQuery.data.items.map((pkg) => (
                    <tr key={pkg.id}>
                      <td className="px-5 py-3 font-medium text-neutral-900">{pkg.name}</td>
                      <td className="px-3 py-3 text-neutral-700">
                        {pkg.durationValue} {pkg.durationUnit.toLowerCase()}
                        {pkg.durationValue !== 1 ? "s" : ""}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-neutral-900">{formatTzs(pkg.priceTzs)}</td>
                      <td className="px-3 py-3 text-neutral-700">{pkg.maxDevices}</td>
                      <td className="px-3 py-3">
                        {pkg.isArchived ? (
                          <Badge>Archived</Badge>
                        ) : pkg.isActive ? (
                          <Badge tone="success">Active</Badge>
                        ) : (
                          <Badge tone="warning">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 text-neutral-500">{formatDateTime(pkg.updatedAt)}</td>
                      {canManage && (
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-2">
                            {!pkg.isArchived && (
                              <>
                                <Button variant="ghost" onClick={() => setEditing(pkg)} disabled={editing !== null}>
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  onClick={() => {
                                    if (window.confirm(`Archive "${pkg.name}"? It will no longer be sold.`)) {
                                      archiveMutation.mutate(pkg.id);
                                    }
                                  }}
                                  loading={archiveMutation.isPending && archiveMutation.variables === pkg.id}
                                >
                                  Archive
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-neutral-600">
              <span>
                Page {page} of {totalPages} · {listQuery.data.total} packages
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </>
  );
}

function PackageForm({
  initial,
  locations,
  locationsLoading,
  onDone,
  onCancel,
}: {
  initial: PackageDto | null;
  locations: LocationDto[];
  locationsLoading: boolean;
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PackageFormValues>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: initial ? toFormValues(initial) : emptyValues,
  });

  const onSubmit = async (values: PackageFormValues) => {
    setServerError(null);
    const payload = toPayload(values);
    try {
      if (initial) {
        await apiFetch<PackageDto>(`/packages/${initial.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        onDone(`Saved changes to "${values.name}".`);
      } else {
        await apiFetch<PackageDto>("/packages", { method: "POST", body: JSON.stringify(payload) });
        onDone(`Created "${values.name}".`);
      }
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Could not save the package.");
    }
  };

  return (
    <Card title={initial ? `Edit ${initial.name}` : "New package"}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        {serverError && <Alert>{serverError}</Alert>}

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Name" error={errors.name?.message}>
            <Input {...register("name")} placeholder="e.g. 1 Day" />
          </Field>
          <Field label="Price (TZS)" error={errors.priceTzs?.message} hint="Whole shillings, no decimals">
            <Input inputMode="numeric" {...register("priceTzs")} placeholder="2000" />
          </Field>
          <Field label="Duration" error={errors.durationValue?.message}>
            <Input inputMode="numeric" {...register("durationValue")} />
          </Field>
          <Field label="Duration unit">
            <Select {...register("durationUnit")}>
              {DURATION_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit.charAt(0) + unit.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Simultaneous devices" error={errors.maxDevices?.message}>
            <Input inputMode="numeric" {...register("maxDevices")} />
          </Field>
          <Field label="Data limit (MB)" error={errors.dataLimitMb?.message} hint="Leave empty for unlimited">
            <Input inputMode="numeric" {...register("dataLimitMb")} />
          </Field>
          <Field label="Download speed (kbps)" error={errors.downloadKbps?.message} hint="Leave empty for no limit">
            <Input inputMode="numeric" {...register("downloadKbps")} />
          </Field>
          <Field label="Upload speed (kbps)" error={errors.uploadKbps?.message} hint="Leave empty for no limit">
            <Input inputMode="numeric" {...register("uploadKbps")} />
          </Field>
        </div>

        <Field label="Description" error={errors.description?.message}>
          <Textarea rows={2} {...register("description")} placeholder="Shown to customers on the portal" />
        </Field>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-neutral-800">Available at locations</legend>
          {locationsLoading ? (
            <div className="grid gap-3 sm:grid-cols-2" role="status" aria-label="Loading locations">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-4/5" />
            </div>
          ) : locations.length === 0 ? (
            <p className="text-sm text-neutral-500">No locations yet. Create one before assigning packages.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {locations.map((location) => (
                <label key={location.id} className="flex items-center gap-2 rounded-md px-1 py-1 text-sm text-neutral-800">
                  <input type="checkbox" value={location.id} className="size-4 accent-brand-700" {...register("locationIds")} />
                  {location.name}
                  <span className="text-neutral-500">({location.code})</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <label className="flex items-center gap-2 text-sm text-neutral-800">
          <input type="checkbox" className="size-4 accent-brand-700" {...register("isActive")} />
          Available for purchase
        </label>

        <div className="flex justify-end gap-2 border-t border-neutral-200 pt-5">
          <Button variant="secondary" onClick={onCancel} type="button">
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {initial ? "Save changes" : "Create package"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
