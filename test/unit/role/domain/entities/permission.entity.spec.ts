import { describe, expect, it } from 'vitest';
import { PermissionEntity } from '../../../../../src/role/domain/entities/permission.entity.js';

describe('PermissionEntity', () => {
  const now = new Date();

  it('should create and sanitize a PermissionEntity correctly', () => {
    const permission = new PermissionEntity({
      id: 1,
      pubId: 'perm_xyz123',
      resource: 'PROJECT',
      action: 'CREATE',
      description: 'Can create projects',
      createdAt: now,
      updatedAt: now,
    });

    expect(permission.id).toBe(1);
    expect(permission.pubId).toBe('perm_xyz123');
    expect(permission.resource).toBe('project');
    expect(permission.action).toBe('create');
    expect(permission.description).toBe('Can create projects');

    const sanitized = permission.sanitize();
    expect(sanitized).toEqual({
      id: 1,
      pubId: 'perm_xyz123',
      resource: 'project',
      action: 'create',
      description: 'Can create projects',
      createdAt: now,
      updatedAt: now,
    });
  });

  it('should update permission details and normalize resource/action', () => {
    const permission = PermissionEntity.reconstitute({
      id: 2,
      pubId: 'perm_abc456',
      resource: 'task',
      action: 'read',
      description: 'Read tasks',
      createdAt: now,
      updatedAt: now,
    });

    permission.updateDetails({
      resource: ' TASK ',
      action: ' DELETE ',
      description: 'Delete tasks',
    });

    expect(permission.resource).toBe('task');
    expect(permission.action).toBe('delete');
    expect(permission.description).toBe('Delete tasks');
  });
});
