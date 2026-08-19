import { AiLabWorkspace } from '@/components/AiLabWorkspace'

/**
 * Pilgrix's primary application surface is the AI Lab.
 * Projects are created and maintained behind the conversation rather than
 * forcing users through a project dashboard before they can edit.
 */
export function Studio(): JSX.Element {
  return <AiLabWorkspace />
}
