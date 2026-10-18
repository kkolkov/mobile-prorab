import { authHeaders, expireSession, type AuthSession } from './auth-storage';
import type { Access } from '../onboarding/access';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiBase } from './rules';
import { createRequest } from './http';
import type { Project, Snapshot, Section } from './types';

const hostUri = Platform.OS==='web' && typeof window!=='undefined' ? window.location.origin : Constants.expoConfig?.hostUri;
export const API_BASE = apiBase(process.env.EXPO_PUBLIC_API_URL, hostUri);
export const request = createRequest(API_BASE, fetch, 15000, authHeaders, expireSession);
export const api = {
  login: (login:string,password:string,register=false) => request<AuthSession>(`/auth/${register?'register':'login'}`,{login,password}),
  me: () => request<{userId:string;login:string}>('/auth/me'),
  logout: () => request('/auth/logout',{}),
  list: () => request<Project[]>('/projects'),
  access: () => request<Access>('/projects/access'),
  accessAction: (action:string,body:unknown={}) => request<Access>(`/projects/access/${action}`,body),
  get: (id: string) => request<Project>(`/projects/${id}`),
  create: (body: unknown) => request<Project>('/projects/draft', body),
  step: (id: string, step: number, body: unknown) => request<Project>(`/projects/${id}/steps/${step}${step === 5 ? '/estimate' : ''}`, body, 'PUT'),
  activate: (p: Project) => request<Project>(`/projects/${p.projectId}/activate?version=${p.version}`, {}, 'POST'),
  estimate: (p: Project) => request<Project>(`/projects/${p.projectId}/estimate?version=${p.version}`, {}, 'POST'),
  refinement: (id: string) => request<Snapshot>(`/projects/${id}/refinement`),
  save: (id: string, section: Section, body: unknown) => request<Snapshot>(`/projects/${id}/refinement/${section}`, body, 'PUT'),
  calculate: (s: Snapshot) => request<Snapshot>(`/projects/${s.project.projectId}/refinement/calculate`, {version: s.project.version}),
  apply: (s: Snapshot) => request<Snapshot>(`/projects/${s.project.projectId}/refinement/apply`, {version: s.project.version, estimateId: s.candidateEstimate?.id}),
};
