export type Project = {
  id: number;
  uuid: string;
  name: string;
  user_id: number;
  group_uuid: string;
};

export type ProjectWithGroupName = Project & {
  group_name?: string;
};

export type ProjectGroup = {
  uuid: string;
  name: string;
  sortOrder: number;
  projects: Project[];
};

export type ProjectSummary = {
  id: number;
  uuid: string;
  name: string;
  group_uuid: string;
  lastImageName: string | null;
  lastCreatedAt: string | number | null;
};

export type ProjectSummaryGroup = {
  uuid: string;
  name: string;
  sortOrder: number;
  projects: ProjectSummary[];
};
