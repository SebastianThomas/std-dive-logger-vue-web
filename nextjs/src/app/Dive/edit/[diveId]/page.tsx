"use client";

import EditDive from "@/components/dive/edit/overview";
import { BasicLayout } from "@/components/globals/basic_layout";
import { useRouter } from "next/navigation";
import { use } from "react";

export default function EditDivePage({
  params,
}: {
  params: Promise<{ diveId: number }>;
}) {
  const { diveId } = use(params);
  const router = useRouter();

  return (
    <BasicLayout page_name="">
      <div className="bg-gray-900 min-h-screen p-4 flex justify-center items-center">
        <EditDive
          diveId={diveId}
          onClose={() => router.push(`/Dive/view/${diveId}`)}
        />
      </div>
    </BasicLayout>
  );
}
