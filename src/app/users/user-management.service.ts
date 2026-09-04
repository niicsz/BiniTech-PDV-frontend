import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'TENANT_ADMIN' | 'OPERATOR';

export interface ManagedUser {
  id: string;
  name: string;
  email: string | null;
  username: string;
  role: UserRole;
  active: boolean;
  currentUser: boolean;
  manageable: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateManagedUserRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/users';

  list(): Observable<ManagedUser[]> {
    return this.http.get<ManagedUser[]>(this.baseUrl);
  }

  get(id: string): Observable<ManagedUser> {
    return this.http.get<ManagedUser>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateManagedUserRequest): Observable<ManagedUser> {
    return this.http.post<ManagedUser>(this.baseUrl, request);
  }

  updateStatus(id: string, active: boolean): Observable<ManagedUser> {
    return this.http.patch<ManagedUser>(`${this.baseUrl}/${id}/status`, { active });
  }

  updateRole(id: string, role: UserRole): Observable<ManagedUser> {
    return this.http.patch<ManagedUser>(`${this.baseUrl}/${id}/role`, { role });
  }
}
