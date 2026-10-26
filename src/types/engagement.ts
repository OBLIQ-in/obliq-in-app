export type Engagement = {
  id: string;
  clientId: string;
  client: string;
  title: string;
  financialYear: string;
  type: string;
  status: string;
  reviewerId: string;
  reviewer: string;
  // The firm's private workspace, created with the engagement.
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
};
