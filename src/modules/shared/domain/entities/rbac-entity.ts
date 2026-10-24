/** An entity read according to its `accessType` (`public` or `private`) and changed by its owner or an admin. */
export interface RbacEntity {
  owner: string;
  accessType: string;
}
