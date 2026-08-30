"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shell/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/errors";
import type { Id } from "@/convex/_generated/dataModel";
import {
  useBuild,
  useBuildCatalog,
  useCreateBuild,
  useForkBuild,
  useRemoveBuild,
  useUpdateBuild,
} from "@/components/builds/api";
import { BuildEditor, newDraft } from "@/components/builds/editor";
import { DRAFT_KEY, type BuildDraft } from "@/components/builds/types";

export default function BuildPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id === "new" ? undefined : params.id;

  const { items, mods, ready } = useBuildCatalog();
  const saved = useBuild(id);
  const create = useCreateBuild();
  const update = useUpdateBuild();
  const remove = useRemoveBuild();
  const fork = useForkBuild();

  // A new page may be carrying the agent's draft, handed over in session storage.
  const [handed] = useState<BuildDraft | null>(() => {
    if (typeof window === "undefined" || params.id !== "new") return null;
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as BuildDraft;
    } catch {
      return null;
    }
  });
  // Read once. A reload should give a blank editor, not the same draft again.
  useEffect(() => sessionStorage.removeItem(DRAFT_KEY), []);

  if (!ready || (id && saved === undefined)) return <Skeleton className="h-96 w-full" />;
  if (id && saved === null) {
    return <PageHeader title="Build" helper="That build is gone." />;
  }

  const initial: BuildDraft = saved
    ? {
        itemId: saved.itemId,
        name: saved.name,
        slots: saved.slots,
        forma: saved.forma,
        orokinReactor: saved.orokinReactor,
        notes: saved.notes,
        public: saved.public,
      }
    : (handed ?? newDraft());

  async function save(draft: BuildDraft) {
    try {
      if (id) {
        await update({ id: id as Id<"builds">, ...draft });
        toast.success("Saved");
      } else {
        const created = await create(draft);
        router.replace(`/builds/${created}`);
      }
    } catch (error) {
      toast.error(errorMessage(error, "That build did not save"));
    }
  }

  return (
    <>
      <PageHeader
        title={saved?.name || "New build"}
        helper={saved?.mine === false ? "Somebody else's public build." : undefined}
      />
      <BuildEditor
        // A saved build and a fresh draft are different editors, so remounting resets the state.
        key={saved?._id ?? "new"}
        initial={initial}
        items={items}
        mods={mods}
        mine={saved ? saved.mine : true}
        onSave={(draft) => void save(draft)}
        shareUrl={
          id && typeof window !== "undefined" ? `${window.location.origin}/builds/${id}` : undefined
        }
        onFork={
          id
            ? () =>
                void fork({ id: id as Id<"builds"> })
                  .then((forked) => router.push(`/builds/${forked}`))
                  .catch((error) => toast.error(errorMessage(error, "That fork did not take")))
            : undefined
        }
        onRemove={
          id
            ? () =>
                void remove({ id: id as Id<"builds"> })
                  .then(() => router.push("/builds"))
                  .catch((error) => toast.error(errorMessage(error, "That build did not go")))
            : undefined
        }
      />
    </>
  );
}
