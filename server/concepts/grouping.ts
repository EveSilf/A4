import { ObjectId } from "mongodb";
import { Authing } from "../app";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError } from "./errors";

export interface CommunityDoc extends BaseDoc {
  groupName: string;
  creator: ObjectId;
  members: Array<ObjectId>;
}

/**
 * concept: Grouping[User]
 */
export default class GroupingConcept {
  public readonly groups: DocCollection<CommunityDoc>;

  /**
   * Make an instance of Grouping.
   */
  constructor(collectionName: string) {
    this.groups = new DocCollection<CommunityDoc>(collectionName);
  }

  async create(creator: ObjectId, groupName: string) {
    const members = [creator];

    //Check if group already exists
    const checkGroup = await this.groups.readOne({ groupName });
    if (checkGroup) throw new NotAllowedError("Group already exists!");

    //Create group
    const _id = await this.groups.createOne({ groupName, creator, members });
    return { msg: "Group created!", group: await this.groups.readOne({ _id }) };
  }

  async addUser(userName: string, groupName: string) {
    //Check if group exists
    const group = await this.groups.readOne({ groupName });
    if (!group) throw new NotAllowedError("Group doesn't exist!");

    //Check if user exists
    const memberId = await Authing.getUserByUsername(userName);
    await Authing.assertUserExists(memberId);

    await this.groups.UpdateFilterOne({ _id: group._id }, { $push: { members: memberId._id } });
    return { msg: "User has been added to the group!" };
  }

  async deleteUser(userName: string, groupName: string) {
    //Check if group exists
    const group = await this.groups.readOne({ groupName });
    if (!group) throw new NotAllowedError("Group doesn't exist!");

    //Check if user exists
    const memberId = await Authing.getUserByUsername(userName);
    await Authing.assertUserExists(memberId);

    await this.groups.UpdateFilterOne({ _id: group._id }, { $pull: { members: memberId._id } });
    return { msg: "User has been removed from the group." };
  }

  async delete(groupId: ObjectId) {
    //Check if group exists
    const group = await this.groups.readOne({ groupId });
    if (!group) throw new NotAllowedError("Group doesn't exist!");

    await this.groups.deleteOne({ groupId });
    return { msg: "deleted group!" };
  }

  async getByName(groupName: string): Promise<CommunityDoc> {
    const group = await this.groups.readOne({ groupName });
    if (!group) throw new NotAllowedError("Group not found.");
    return group;
  }

  async getById(groupId: ObjectId) {
    const group = await this.groups.readOne({ _id: groupId });
    if (!group) throw new NotAllowedError("Group not found.");
    return group;
  }
}
