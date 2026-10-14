// A save the user can fix, such as a name already in use. Forms show the
// message as is.
export class WorkspaceConflict extends Error {}

// Names are unique per firm for clients and per client for projects, ignoring
// case. The browser preview and the backend use the same wording.
export const clientTaken = (name: string) =>
  `A client named "${name}" already exists.`;
export const projectTaken = (name: string, client: string) =>
  `${client} already has a project named "${name}".`;
