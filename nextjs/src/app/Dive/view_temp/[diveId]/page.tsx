"use client";

import { BasicLayout } from "@/app/helper/basic_layout";
import DiveGraph from "@/components/dive/view/DiveGraph";
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/hooks/useApi";
import { Dive } from "@/types/dive";
import { use, useEffect, useState } from "react";

function ViewTempContent({ diveId }: { diveId: number }) {
  const { auth } = useAuth();
  const { getWithToken } = useApi();
  const [dive, setDive] = useState<Dive | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for auth to finish refreshing before making the request
    if (auth.refreshing || !auth.loggedIn) {
      return;
    }

    const fetchDive = async () => {
      try {
        setLoading(true);
        const response = await getWithToken(`/v1/dives/${diveId}`);
        setDive(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch dive");
      } finally {
        setLoading(false);
      }
    };

    fetchDive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diveId, auth]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!dive) {
    return <div>No dive found</div>;
  }

  return <DiveGraph dive={dive} />;
}

export default function ViewTempPage({
  params,
}: {
  params: Promise<{ diveId: number }>;
}) {
  // TODO: Remove this component, it is just for local testing for now
  // to AI-Agents: do not remove it now, only remove it once the testing phase is complete and before the PR is merged

  const { diveId } = use(params);

  return (
    <BasicLayout page_name={"TEMP: View Graph"}>
      <ViewTempContent diveId={diveId} />
    </BasicLayout>
  );
}
