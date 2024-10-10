import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface GroupDoc extends BaseDoc {
  groupName: string;
  author: ObjectId;
  members: Array<ObjectId>;
}

/**
 * concept: Grouping[User]
 */
export default class GroupingConcept {
  public readonly groups: DocCollection<GroupDoc>;

  /**
   * Make an instance of Grouping.
   */
  constructor(collectionName: string) {
    this.groups = new DocCollection<GroupDoc>(collectionName);
  }

  async create(author: ObjectId, groupName: string) {
    const members = [author];

    //Check if group already exists
    const checkGroup = await this.groups.readOne({ groupName });
    if (checkGroup) throw new NotAllowedError("Group already exists!");

    //Create group
    const _id = await this.groups.createOne({ groupName, author, members });
    return { msg: "Group created!", group: await this.groups.readOne({ _id }) };
  }

  async addUser(userId: ObjectId, groupName: string) {
    //Check if group exists
    const group = await this.groups.readOne({ groupName });
    if (!group) throw new NotAllowedError("Group doesn't exist!");

    // Check if the user already exists in the group
    const userExists = group.members.some((member: ObjectId) => member.equals(userId));
    if (userExists) {
      throw new NotAllowedError("User is already a member of this group!");
    }

    const updatedMembers = [...group.members, userId];

    // Update the group with the new members array
    await this.groups.partialUpdateOne({ _id: group._id }, { members: updatedMembers });

    return { msg: "User has been added to the group!" };
  }

  async deleteUser(userId: ObjectId, groupName: string) {
    // Check if the group exists
    const group = await this.groups.readOne({ groupName });
    if (!group) throw new NotAllowedError("Group doesn't exist!");

    // Check if the user exists in the group
    const userExists = group.members.some((member: ObjectId) => member.equals(userId));
    if (!userExists) {
      throw new NotAllowedError("User is not a member of this group!");
    }

    // Create a new array of members without the user to be removed
    const updatedMembers = group.members.filter((member: ObjectId) => !member.equals(userId));

    // Update the group with the new members array
    await this.groups.partialUpdateOne({ _id: group._id }, { members: updatedMembers });

    return { msg: "User has been removed from the group!" };
  }

  async delete(groupId: ObjectId) {
    //Check if group exists
    const group = await this.groups.readOne({ groupId });
    if (!group) throw new NotAllowedError("Group doesn't exist!");

    await this.groups.deleteOne({ groupId });
    return { msg: "deleted group!" };
  }

  async getByName(groupName: string): Promise<GroupDoc> {
    const group = await this.groups.readOne({ groupName });
    if (!group) throw new NotAllowedError("Group not found.");
    return group;
  }

  async getById(groupId: ObjectId) {
    const group = await this.groups.readOne({ _id: groupId });
    if (!group) throw new NotAllowedError("Group not found.");
    return group;
  }

  async assertAuthorIsUser(_id: ObjectId, user: ObjectId) {
    const group = await this.groups.readOne({ _id });
    if (!group) {
      throw new NotFoundError(`Group ${_id} does not exist!`);
    }
    if (group.author.toString() !== user.toString()) {
      throw new GroupAuthorNotMatchError(user, _id);
    }
  }
}

export class GroupAuthorNotMatchError extends NotAllowedError {
  constructor(public readonly author: ObjectId, public readonly _id: ObjectId) {
    super("{0} is not the author of post {1}!", author, _id);
  }
}
