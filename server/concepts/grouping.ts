import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface GroupDoc extends BaseDoc {
  groupId: string;
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

  async create(author: ObjectId, groupId: string) {
    const members = [author];

    //Check if group already exists
    const checkGroup = await this.groups.readOne({ groupId });
    if (checkGroup) throw new NotAllowedError("Group already exists!");

    //Create group
    const _id = await this.groups.createOne({ groupId, author, members });
    return { msg: "Group created!", group: await this.groups.readOne({ _id }) };
  }

  async getGroups() {
    // Returns all groups! You might want to page for better client performance
    return await this.groups.readMany({}, { sort: { _id: -1 } });
  }

  async addUser(userId: ObjectId, _id: ObjectId) {
    //Check if group exists
    const group = await this.groups.readOne({ _id });
    if (!group) throw new GroupNotFoundError(_id);

    // Check if the user already exists in the group
    const userExists = group.members.some((member: ObjectId) => member.equals(userId));
    if (userExists) {
      throw new NotAllowedError("User is already a member of this group!");
    }

    const updatedMembers = [...group.members, userId];

    // Update the group with the new members array
    await this.groups.partialUpdateOne({ _id }, { members: updatedMembers });

    return { msg: "User has been added to the group!" };
  }

  async deleteUser(userId: ObjectId, _id: ObjectId) {
    //Check if group exists
    const group = await this.groups.readOne({ _id });
    if (!group) throw new GroupNotFoundError(_id);

    // Check if the user already exists in the group
    const userExists = group.members.some((member: ObjectId) => member.equals(userId));
    if (!userExists) {
      throw new NotAllowedError("User is not a member of this group!");
    }

    const updatedMembers = group.members.filter((member: ObjectId) => !member.equals(userId));

    // Update the group with the new members array
    await this.groups.partialUpdateOne({ _id }, { members: updatedMembers });

    return { msg: "User has been deleted from the group!" };
  }

  async delete(_id: ObjectId) {
    //Check if group exists
    const group = await this.groups.readOne({ _id });
    if (!group) throw new GroupNotFoundError(_id);

    await this.groups.deleteOne({ _id });
    return { msg: "deleted group!" };
  }

  async getByName(groupName: string): Promise<GroupDoc> {
    const group = await this.groups.readOne({ groupName });
    if (!group) throw new NotAllowedError("Group not found.");
    return group;
  }

  async getById(_id: ObjectId) {
    return await this.groups.readOne({ _id });
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

  async getByAuthor(author: ObjectId) {
    return await this.groups.readMany({ author });
  }
}

export class GroupAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the author of group {1}!", author, _id);
  }
}

export class GroupNotFoundError extends NotFoundError {
  constructor(public readonly _id: ObjectId) {
    super(`Group ${_id} does not exist!`);
  }
}
