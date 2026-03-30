import { get, set, keys, del } from 'idb-keyval';
import { Project } from '../types';

export async function saveProject(project: Project): Promise<void> {
  await set(`project_${project.id}`, project);
}

export async function loadProject(id: string): Promise<Project | undefined> {
  return await get(`project_${id}`);
}

export async function getAllProjects(): Promise<Project[]> {
  const allKeys = await keys();
  const projectKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith('project_'));
  const projects = await Promise.all(projectKeys.map(k => get(k as string)));
  return projects.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteProject(id: string): Promise<void> {
  await del(`project_${id}`);
}
