import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStudioStore } from '../store/useStudioStore';
import { StudioWorkspace } from '../studio/StudioWorkspace';

export function StudioPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeProjectId = useStudioStore((s) => s.activeProjectId);
  const localDemo = useStudioStore((s) => s.localDemo);
  const setActiveProjectId = useStudioStore((s) => s.setActiveProjectId);

  // Hydrate initial project from URL query parameter if provided
  useEffect(() => {
    const fromQuery = searchParams.get('project');
    if (fromQuery && fromQuery !== activeProjectId) {
      setActiveProjectId(fromQuery);
    }
    // Only run when the query param changes externally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Keep `?project=` synced when a backend project is selected inside Studio
  useEffect(() => {
    const current = searchParams.get('project');
    if (localDemo) {
      if (current) {
        searchParams.delete('project');
        setSearchParams(searchParams, { replace: true });
      }
      return;
    }
    if (activeProjectId && current !== activeProjectId) {
      setSearchParams({ project: activeProjectId }, { replace: true });
    } else if (!activeProjectId && current) {
      searchParams.delete('project');
      setSearchParams(searchParams, { replace: true });
    }
  }, [activeProjectId, localDemo, searchParams, setSearchParams]);

  return <StudioWorkspace />;
}
