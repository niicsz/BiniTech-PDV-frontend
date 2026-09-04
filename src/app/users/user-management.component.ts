import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../auth/services/auth.service';
import {
  CreateManagedUserRequest,
  ManagedUser,
  UserManagementService,
  UserRole,
} from './user-management.service';

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  TENANT_ADMIN: 'Admin da loja',
  OPERATOR: 'Operador',
};

@Component({
  selector: 'app-confirm-user-status-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>{{ data.activate ? 'Ativar usuário' : 'Desativar usuário' }}</h2>
    <mat-dialog-content>
      <div class="dialog-message">
        <mat-icon>{{ data.activate ? 'person_check' : 'person_off' }}</mat-icon>
        <p>
          {{ data.activate ? 'Reativar' : 'Desativar' }} o acesso de
          <strong>{{ data.name }}</strong>?
          @if (!data.activate) {
            <span>As sessões atuais serão encerradas imediatamente.</span>
          }
        </p>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Cancelar</button>
      <button mat-flat-button [color]="data.activate ? 'primary' : 'warn'" [mat-dialog-close]="true">
        {{ data.activate ? 'Ativar' : 'Desativar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-message { display:flex; gap:14px; align-items:flex-start; padding-top:8px; max-width:430px; }
    .dialog-message mat-icon { color:var(--primary); flex:0 0 auto; }
    .dialog-message p { color:var(--text); line-height:1.5; }
    .dialog-message span { display:block; margin-top:8px; color:var(--danger); font-size:13px; }
  `],
})
export class ConfirmUserStatusDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmUserStatusDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { name: string; activate: boolean },
  ) {}
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss',
})
export class UserManagementComponent implements OnInit {
  private readonly userService = inject(UserManagementService);
  readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly users = signal<ManagedUser[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly actionUserId = signal<string | null>(null);
  readonly errorMessage = signal('');
  readonly showCreateForm = signal(false);
  readonly searchTerm = signal('');
  readonly roleFilter = signal<UserRole | 'ALL'>('ALL');
  readonly roleDrafts = signal<Record<string, UserRole>>({});

  readonly filteredUsers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const role = this.roleFilter();
    return this.users().filter(user => {
      const matchesTerm = !term || [user.name, user.email, user.username]
        .some(value => value?.toLowerCase().includes(term));
      return matchesTerm && (role === 'ALL' || user.role === role);
    });
  });
  readonly activeCount = computed(() => this.users().filter(user => user.active).length);
  readonly inactiveCount = computed(() => this.users().filter(user => !user.active).length);

  form: CreateManagedUserRequest & { confirmPassword: string } = this.emptyForm();

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.userService.list().subscribe({
      next: users => {
        this.users.set(users);
        this.roleDrafts.set(Object.fromEntries(users.map(user => [user.id, user.role])));
        this.loading.set(false);
      },
      error: error => {
        this.loading.set(false);
        this.errorMessage.set(this.apiError(error, 'Não foi possível carregar os usuários.'));
      },
    });
  }

  createUser(): void {
    this.errorMessage.set('');
    if (!this.form.name.trim() || !this.form.email.trim() || !this.form.password) {
      this.errorMessage.set('Preencha nome, e-mail e senha.');
      return;
    }
    if (this.form.password.length < 6) {
      this.errorMessage.set('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (this.form.password !== this.form.confirmPassword) {
      this.errorMessage.set('As senhas não coincidem.');
      return;
    }

    this.saving.set(true);
    const request: CreateManagedUserRequest = {
      name: this.form.name.trim(),
      email: this.form.email.trim(),
      password: this.form.password,
      role: this.authService.isAdmin() ? this.form.role : 'OPERATOR',
    };
    this.userService.create(request).subscribe({
      next: user => {
        this.saving.set(false);
        this.showCreateForm.set(false);
        this.form = this.emptyForm();
        this.upsertUser(user);
        this.snackBar.open(`Usuário “${user.name}” criado com sucesso.`, 'OK', {
          duration: 4000,
          panelClass: ['snackbar-success'],
        });
      },
      error: error => {
        this.saving.set(false);
        this.errorMessage.set(this.apiError(error, 'Não foi possível criar o usuário.'));
      },
    });
  }

  confirmStatusChange(user: ManagedUser): void {
    if (!user.manageable) return;
    this.dialog.open(ConfirmUserStatusDialogComponent, {
      width: '460px',
      data: { name: user.name, activate: !user.active },
    }).afterClosed().subscribe(confirmed => {
      if (confirmed) this.changeStatus(user);
    });
  }

  saveRole(user: ManagedUser): void {
    const role = this.roleDrafts()[user.id];
    if (!user.manageable || !role || role === user.role) return;
    if (!window.confirm(`Alterar o perfil de ${user.name} para ${this.roleLabel(role)}? As sessões atuais serão encerradas.`)) {
      this.setRoleDraft(user.id, user.role);
      return;
    }

    this.actionUserId.set(user.id);
    this.userService.updateRole(user.id, role).subscribe({
      next: updated => {
        this.actionUserId.set(null);
        this.upsertUser(updated);
        this.snackBar.open('Perfil atualizado com sucesso.', 'OK', {
          duration: 3500,
          panelClass: ['snackbar-success'],
        });
      },
      error: error => {
        this.actionUserId.set(null);
        this.setRoleDraft(user.id, user.role);
        this.snackBar.open(this.apiError(error, 'Não foi possível alterar o perfil.'), 'OK', {
          duration: 5000,
          panelClass: ['snackbar-error'],
        });
      },
    });
  }

  setRoleDraft(userId: string, role: UserRole): void {
    this.roleDrafts.update(drafts => ({ ...drafts, [userId]: role }));
  }

  roleLabel(role: UserRole): string {
    return ROLE_LABELS[role];
  }

  roleClass(role: UserRole): string {
    return `role-${role.toLowerCase().replace('_', '-')}`;
  }

  cancelCreate(): void {
    this.showCreateForm.set(false);
    this.errorMessage.set('');
    this.form = this.emptyForm();
  }

  private changeStatus(user: ManagedUser): void {
    this.actionUserId.set(user.id);
    this.userService.updateStatus(user.id, !user.active).subscribe({
      next: updated => {
        this.actionUserId.set(null);
        this.upsertUser(updated);
        this.snackBar.open(`Usuário ${updated.active ? 'ativado' : 'desativado'} com sucesso.`, 'OK', {
          duration: 3500,
          panelClass: ['snackbar-success'],
        });
      },
      error: error => {
        this.actionUserId.set(null);
        this.snackBar.open(this.apiError(error, 'Não foi possível alterar o status.'), 'OK', {
          duration: 5000,
          panelClass: ['snackbar-error'],
        });
      },
    });
  }

  private upsertUser(user: ManagedUser): void {
    this.users.update(users => {
      const existing = users.findIndex(item => item.id === user.id);
      const updated = existing >= 0
        ? users.map(item => item.id === user.id ? user : item)
        : [...users, user];
      return updated.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    });
    this.setRoleDraft(user.id, user.role);
  }

  private emptyForm(): CreateManagedUserRequest & { confirmPassword: string } {
    return { name: '', email: '', password: '', confirmPassword: '', role: 'OPERATOR' };
  }

  private apiError(error: HttpErrorResponse, fallback: string): string {
    if (error.status === 403) {
      return 'Você não tem permissão para realizar esta operação.';
    }
    return error.error?.message || fallback;
  }
}
