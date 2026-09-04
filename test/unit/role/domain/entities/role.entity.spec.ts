import { describe, expect, it } from 'vitest';
import { RoleEntity } from '../../../../../src/role/domain/entities/role.entity.js';

describe('RoleEntity', () => {
  const now = new Date();

  it('should create and sanitize a RoleEntity correctly', () => {
    const role = new RoleEntity({
      id: 1,
      pubId: 'rol_abc123',
      name: '  Project Lead  ',
      description: 'Leads project developments',
      organizationId: 10,
      createdAt: now,
      updatedAt: now,
    });

    expect(role.id).toBe(1);
    expect(role.pubId).toBe('rol_abc123');
    expect(role.name).toBe('Project Lead');
    expect(role.description).toBe('Leads project developments');
    expect(role.organizationId).toBe(10);
    expect(role.permissions).toEqual([]);

    const sanitized = role.sanitize();
    expect(sanitized.name).toBe('Project Lead');
    expect(sanitized.organizationId).toBe(10);
  });

  it('should update role name and description', () => {
    const role = RoleEntity.reconstitute({
      id: 2,
      pubId: 'rol_def456',
      name: 'Developer',
      description: null,
      organizationId: 10,
      createdAt: now,
      updatedAt: now,
    });

    role.updateDetails({
      name: ' Senior Developer ',
      description: 'Senior dev role',
    });

    expect(role.name).toBe('Senior Developer');
    expect(role.description).toBe('Senior dev role');
  });

  it('should throw error when updating name with empty string', () => {
    const role = RoleEntity.reconstitute({
      id: 3,
      pubId: 'rol_ghi789',
      name: 'QA',
      organizationId: 10,
      createdAt: now,
      updatedAt: now,
    });

    expect(() => role.updateDetails({ name: '   ' })).toThrowError(
      'Role name cannot be empty',
    );
  });
});
