import type { Problem } from '@playliberty/contracts';
import { ProblemSchema } from '@playliberty/contracts';

/* A body that is not a problem document reads as no problem, never a throw. */
export async function readProblem(response: Response): Promise<Problem | null> {
  const body: unknown = await response.json().catch(() => null);
  const problem = ProblemSchema.safeParse(body);

  return problem.success ? problem.data : null;
}
