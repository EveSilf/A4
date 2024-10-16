import { ObjectId } from "mongodb";
import { z } from "zod";
import { Authing, Filtering, Friending, Grouping, Posting, Quizzing, Sessioning } from "./app";
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

  // Grouping
  @Router.get("/groups")
  @Router.validate(z.object({ author: z.string().optional() }))
  async getGroups(author?: string) {
    let groups;
    if (author) {
      const id = (await Authing.getUserByUsername(author))._id;
      groups = await Grouping.getByAuthor(id);
    } else {
      groups = await Grouping.getGroups();
    }
    return Responses.groups(groups);
  }

  @Router.post("/groups")
  async createGroup(session: SessionDoc, groupName: string) {
    const user = Sessioning.getUser(session);
    return await Grouping.create(user, groupName);
  }

  @Router.patch("/groups/:id")
  async addGroupUser(session: SessionDoc, userId: string, id: string) {
    const authorId = Sessioning.getUser(session);
    const uid = new ObjectId(userId);
    const gid = new ObjectId(id);
    await Grouping.assertAuthorIsUser(gid, authorId);
    return await Grouping.addUser(uid, gid);
  }

  @Router.delete("/groups/:id")
  async deleteGroupUser(session: SessionDoc, userId: string, id: string) {
    const authorId = Sessioning.getUser(session);
    const uid = new ObjectId(userId);
    const gid = new ObjectId(id);
    await Grouping.assertAuthorIsUser(gid, authorId);
    return await Grouping.deleteUser(uid, gid);
  }

  @Router.delete("/groups")
  async deleteGroup(session: SessionDoc, id: string) {
    const authorId = Sessioning.getUser(session);
    const gid = new ObjectId(id);

    await Grouping.assertAuthorIsUser(gid, authorId);
    return await Grouping.delete(gid);
  }

  // Filtering
  @Router.get("/filters")
  @Router.validate(z.object({ author: z.string().optional() }))
  async getFilters(author?: string) {
    let filters;
    if (author) {
      const id = (await Authing.getUserByUsername(author))._id;
      filters = await Filtering.getByAuthor(id);
    } else {
      filters = await Filtering.getFilters();
    }
    return Responses.filters(filters);
  }

  @Router.post("/filters")
  async addFilter(session: SessionDoc, filter: string) {
    const authorId = Sessioning.getUser(session);
    return await Filtering.add(authorId, filter);
  }

  @Router.delete("/filters")
  async removeFilter(session: SessionDoc, filter: string) {
    const authorId = Sessioning.getUser(session);
    return await Filtering.remove(authorId, filter);
  }

  @Router.get("/posts")
  @Router.validate(z.object({ author: z.string().optional(), filterList: z.array(z.string()).optional() }))
  async getFilteredPosts(filterList: string[] = [], author?: string) {
    let posts;
    if (author) {
      const id = (await Authing.getUserByUsername(author))._id;
      posts = await Posting.getByAuthor(id);
    } else {
      posts = await Posting.getPosts();
    }

    let filtered_posts = posts;
    if (filterList.length > 0) {
      filtered_posts = posts.filter((post) => this.filter(filterList, post.tags));
    }

    return Responses.posts(filtered_posts);
  }

  async filter(filterList: string[], tags: string[]) {
    // Filter items that contain any of the filter names in their tags
    return filterList.some((filter) => tags.includes(filter));
  }

  // Quizzing
  @Router.get("/quizzes")
  @Router.validate(z.object({ author: z.string().optional() }))
  async getQuizzes(author?: string) {
    let quizzes;
    if (author) {
      const id = (await Authing.getUserByUsername(author))._id;
      quizzes = await Quizzing.getByAuthor(id);
    } else {
      quizzes = await Quizzing.getQuizzes();
    }
    return Responses.quizzes(quizzes);
  }

  @Router.post("/quizzes")
  async createQuiz(session: SessionDoc, question: string, tags: string, options: string, answer: string) {
    const user = Sessioning.getUser(session);

    // Convert tags to a string array and options to a set string
    const tagsArray = tags.split(",").map((tag) => tag.trim());
    const optionsArray = options.split(",").map((option) => option.trim());

    return await Quizzing.create(user, question, tagsArray, optionsArray, answer);
  }

  @Router.patch("/quizzes/:id")
  async modifyQuiz(session: SessionDoc, id: string, question: string, tags: string, options: string, answer: string) {
    const user = Sessioning.getUser(session);
    const quizId = new ObjectId(id);

    await Quizzing.assertAuthorIsUser(quizId, user);

    // Convert tags to a string array and options to a string array
    const tagsArray = tags ? tags.split(",").map((tag) => tag.trim()) : undefined;
    const optionsArray = options ? options.split(",").map((option) => option.trim()) : undefined;

    return await Quizzing.modifyQuiz(quizId, question, tagsArray, optionsArray, answer);
  }

  @Router.delete("/quizzes")
  async deleteQuiz(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const quizId = new ObjectId(id);
    await Quizzing.assertAuthorIsUser(quizId, user);
    return await Quizzing.delete(quizId);
  }
}

/** The web app. */
export const app = new Routes();

/** The Express router. */
export const appRouter = getExpressRouter(app);
