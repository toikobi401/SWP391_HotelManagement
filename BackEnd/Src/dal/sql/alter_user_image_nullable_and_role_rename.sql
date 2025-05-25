-- Allow NULL for Image in User table
ALTER TABLE [dbo].[User]
ALTER COLUMN [Image] [varbinary](max) NULL;

-- Rename RoleURL to RoleName in Role table
EXEC sp_rename 'Role.RoleURL', 'RoleName', 'COLUMN';
