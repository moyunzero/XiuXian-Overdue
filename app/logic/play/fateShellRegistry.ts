import type { FateShell, PlayRunState } from '~/types/play'
import { getFateShellFromCatalog } from '~/logic/play/fateCatalog'

export function getFateShell(run: Pick<PlayRunState, 'primaryFate'>): FateShell {
  try {
    return getFateShellFromCatalog(run.primaryFate)
  } catch {
    return getFateShellFromCatalog('human')
  }
}

/** head_jar 等禁用四格动作时，排程 tile 不可点 */
export function isScheduleActionDisabled(
  run: Pick<PlayRunState, 'primaryFate'>,
  actionId: string
): boolean {
  const shell = getFateShell(run)
  return shell.disabledActions.includes(actionId)
}
