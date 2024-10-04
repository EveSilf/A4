import { ObjectId } from "mongodb";
import { z } from "zod";
import { Authing, Filtering, Friending, Grouping, Posting, Sessioning } from "./app";
import { PostOptions } from "./concepts/posting";
import { SessionDoc } from "./concepts/sessioning";
import { getExpressRouter, Router } from "./framework/router";
import Responses from "./responses";

/**
 * Web server routes for the app. Implements synchronizations between concepts.
 */
class Routes {
  // Synchronize the concepts from `app.ts`.

  @Router.get("/session")
  async getSessionUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.getUserById(user);
  }

  @Router.get("/users")
  async getUsers() {
    return await Authing.getUsers();
  }

  @Router.get("/users/:username")
  @Router.validate(z.object({ username: z.string().min(1) }))
  async getUser(username: string) {
    return await Authing.getUserByUsername(username);
  }

  @Router.post("/users")
  async createUser(session: SessionDoc, username: string, password: string) {
    Sessioning.isLoggedOut(session);
    return await Authing.create(username, password);
  }

  @Router.patch("/users/username")
  async updateUsername(session: SessionDoc, username: string) {
    const user = Sessioning.getUser(session);
    return await Authing.updateUsername(user, username);
  }

  @Router.patch("/users/password")
  async updatePassword(session: SessionDoc, currentPassword: string, newPassword: string) {
    const user = Sessioning.getUser(session);
    return Authing.updatePassword(user, currentPassword, newPassword);
  }

  @Router.delete("/users")
  async deleteUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    Sessioning.end(session);
    return await Authing.delete(user);
  }

  @Router.post("/login")
  async logIn(session: SessionDoc, username: string, password: string) {
    const u = await Authing.authenticate(username, password);
    Sessioning.start(session, u._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/logout")
  async logOut(session: SessionDoc) {
    Sessioning.end(session);
    return { msg: "Logged out!" };
  }

  @Router.get("/posts")
  @Router.validate(z.object({ author: z.string().optional() }))
  async getPosts(author?: string) {
    let posts;
    if (author) {
      const id = (await Authing.getUserByUsername(author))._id;
      posts = await Posting.getByAuthor(id);
    } else {
      posts = await Posting.getPosts();
    }
    return Responses.posts(posts);
  }

  @Router.post("/posts")
  async createPost(session: SessionDoc, content: string, options?: PostOptions) {
    const user = Sessioning.getUser(session);
    const created = await Posting.create(user, content, options);
    return { msg: created.msg, post: await Responses.post(created.post) };
  }

  @Router.patch("/posts/:id")
  async updatePost(session: SessionDoc, id: string, content?: string, options?: PostOptions) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Posting.assertAuthorIsUser(oid, user);
    return await Posting.update(oid, content, options);
  }

  @Router.delete("/posts/:id")
  async deletePost(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Posting.assertAuthorIsUser(oid, user);
    return Posting.delete(oid);
  }

  @Router.get("/friends")
  async getFriends(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.idsToUsernames(await Friending.getFriends(user));
  }

  @Router.delete("/friends/:friend")
  async removeFriend(session: SessionDoc, friend: string) {
    const user = Sessioning.getUser(session);
    const friendOid = (await Authing.getUserByUsername(friend))._id;
    return await Friending.removeFriend(user, friendOid);
  }

  @Router.get("/friend/requests")
  async getRequests(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Responses.friendRequests(await Friending.getRequests(user));
  }

  @Router.post("/friend/requests/:to")
  async sendFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.sendRequest(user, toOid);
  }

  @Router.delete("/friend/requests/:to")
  async removeFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.removeRequest(user, toOid);
  }

  @Router.put("/friend/accept/:from")
  async acceptFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.acceptRequest(fromOid, user);
  }

  @Router.put("/friend/reject/:from")
  async rejectFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.rejectRequest(fromOid, user);
  }

  //Grouping
  @Router.post("/groups")
  async createGroup(session: SessionDoc, groupName: string) {
    const user = Sessioning.getUser(session);
    return await Grouping.create(user, groupName);
  }

  @Router.post("/groups/:groupName/users")
  async addMemberToGroup(session: SessionDoc, groupName: string, username: string) {
    const user = Sessioning.getUser(session);
    const creator = await Authing.authenticate(user.username, user.password);
    const group = await Grouping.getByName(groupName);

    if (creator === group.creator) {
      await Grouping.addUser(username, groupName);
      return { msg: "User added to group." };
    } else {
      throw new Error("Unsuccessful add: Wrong creator.");
    }
  }

  @Router.delete("/groups/:groupName/users")
  async deleteMemberFromGroup(session: SessionDoc, groupName: string, username: string) {
    const user = Sessioning.getUser(session);
    const creator = await Authing.authenticate(user.username, user.password);
    const group = await Grouping.getByName(groupName);

    if (creator === group.creator) {
      await Grouping.deleteUser(username, groupName);
      return { msg: "User removed from group." };
    } else {
      throw new Error("Unsuccessful remove: Wrong creator.");
    }
  }

  @Router.delete("/groups/:groupId")
  async deleteGroup(session: SessionDoc, groupId: string) {
    const user = Sessioning.getUser(session);
    const group = await Grouping.getById(groupId);
    const creator = await Authing.authenticate(user.username, user.password);

    if (creator === group.creator) {
      await Grouping.delete(groupId);
      return { msg: "Group deleted." };
    } else {
      throw new Error("Unauthorized action.");
    }
  }

  //Filtering
  @Router.post("/filters")
  async addFilter(filterName: string) {
    return await Filtering.add(filterName);
  }

  @Router.delete("/filters/:name")
  async removeFilter(filterName: string) {
    return await Filtering.remove(filterName);
  }

  @Router.get("/filters")
  async filterPosts() {
    return await Filtering.filter(Filtering.filters);
  }

  @Router.post("/filters/apply")
  async applyFilters(session: SessionDoc, tags: ObjectId[]) {
    const posts = await Posting.getPosts();
    return await Filtering.filter(tags);
  }

  // Filter Grouping
  @Router.post("/filter-groupings")
  async createFilterGrouping(n: string, t: ObjectId[]) {
    // Action: Create a new filter grouping.
  }

  @Router.post("/filter-groupings/:id/tags")
  async addTagsToFilterGrouping(id: ObjectId, t: ObjectId[]) {
    // Action: Add tags from filter grouping with given id.
  }

  @Router.delete("/filter-groupings/:id/tags")
  async removeTagsFromFilterGrouping(id: ObjectId, t: ObjectId[]) {
    // Action: Remove tags from filter grouping with given id.
  }

  @Router.delete("/filter-groupings/:id")
  async deleteFilterGrouping(id: ObjectId) {
    // Action: Delete the filter grouping with given id.
  }

  //Quizzing
  @Router.post("/quizzes")
  async createQuiz(q: string, t: Set<string>, o: Set<string>, a: String) {
    // Action: Create a new quiz
  }

  @Router.patch("/quizzes/:id/options")
  async modifyQuizOptions(id: ObjectId, o: Set<string>) {
    // Action: Modify answer options for quiz with given id.
  }

  @Router.patch("/quizzes/:id/question")
  async modifyQuizQuestion(id: ObjectId, q: string) {
    // Action: Modify question for quiz with given id.
  }

  @Router.patch("/quizzes/:id/filters")
  async modifyQuizFilters(id: ObjectId, t: ObjectId[]) {
    // Action: Update filters for quiz with given id.
  }

  @Router.delete("/quizzes/:id")
  async deleteQuiz(id: ObjectId) {
    // Action: Delete quiz with given id.
  }
}

/** The web app. */
export const app = new Routes();

/** The Express router. */
export const appRouter = getExpressRouter(app);
