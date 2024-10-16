import { Authing } from "./app";
import { FilterDoc } from "./concepts/filtering";
import { AlreadyFriendsError, FriendNotFoundError, FriendRequestAlreadyExistsError, FriendRequestDoc, FriendRequestNotFoundError } from "./concepts/friending";
import { GroupDoc } from "./concepts/grouping";
import { PostAuthorNotMatchError, PostDoc } from "./concepts/posting";
import { QuizDoc } from "./concepts/quizzing";
import { Router } from "./framework/router";

/**
 * This class does useful conversions for the frontend.
 * For example, it converts a {@link PostDoc} into a more readable format for the frontend.
 */
export default class Responses {
  /**
   * Convert PostDoc into more readable format for the frontend by converting the author id into a username.
   */
  static async post(post: PostDoc | null) {
    if (!post) {
      return post;
    }
    const author = await Authing.getUserById(post.author);
    return { ...post, author: author.username };
  }

  /**
   * Same as {@link post} but for an array of PostDoc for improved performance.
   */
  static async posts(posts: PostDoc[]) {
    const authors = await Authing.idsToUsernames(posts.map((post) => post.author));
    return posts.map((post, i) => ({ ...post, author: authors[i] }));
  }

  /**
   * Convert GroupDoc into more readable format for the frontend
   * by converting the member ids into usernames.
   */
  static async groups(groups: GroupDoc[]) {
    const memberIds = groups.flatMap((group) => group.members);
    const usernames = await Authing.idsToUsernames(memberIds);
    let usernameIndex = 0;
    return groups.map((group) => {
      const members = group.members.map(() => usernames[usernameIndex++]);
      return { ...group, members };
    });
  }
  /**
   * Convert filter names into a more readable format for the frontend.
   */
  static async filters(filters: FilterDoc[]) {
    return filters.map((filter) => ({ ...filter, readableName: filter.name }));
  }

  /**
   * Convert QuizDoc into more readable format for the frontend
   * by converting the author id into a username.
   */
  static async quiz(quiz: QuizDoc | null) {
    if (!quiz) {
      return quiz;
    }
    const author = await Authing.getUserById(quiz.author);
    return { ...quiz, author: author.username };
  }

  /**
   * Same as {@link quiz} but for an array of QuizDoc for improved performance.
   */
  static async quizzes(quizzes: QuizDoc[]) {
    const authors = await Authing.idsToUsernames(quizzes.map((quiz) => quiz.author));
    return quizzes.map((quiz, i) => ({ ...quiz, author: authors[i] }));
  }

  /**
   * Convert FriendRequestDoc into more readable format for the frontend
   * by converting the ids into usernames.
   */
  static async friendRequests(requests: FriendRequestDoc[]) {
    const from = requests.map((request) => request.from);
    const to = requests.map((request) => request.to);
    const usernames = await Authing.idsToUsernames(from.concat(to));
    return requests.map((request, i) => ({ ...request, from: usernames[i], to: usernames[i + requests.length] }));
  }
}

Router.registerError(PostAuthorNotMatchError, async (e) => {
  const username = (await Authing.getUserById(e.author)).username;
  return e.formatWith(username, e._id);
});

Router.registerError(FriendRequestAlreadyExistsError, async (e) => {
  const [user1, user2] = await Promise.all([Authing.getUserById(e.from), Authing.getUserById(e.to)]);
  return e.formatWith(user1.username, user2.username);
});

Router.registerError(FriendNotFoundError, async (e) => {
  const [user1, user2] = await Promise.all([Authing.getUserById(e.user1), Authing.getUserById(e.user2)]);
  return e.formatWith(user1.username, user2.username);
});

Router.registerError(FriendRequestNotFoundError, async (e) => {
  const [user1, user2] = await Promise.all([Authing.getUserById(e.from), Authing.getUserById(e.to)]);
  return e.formatWith(user1.username, user2.username);
});

Router.registerError(AlreadyFriendsError, async (e) => {
  const [user1, user2] = await Promise.all([Authing.getUserById(e.user1), Authing.getUserById(e.user2)]);
  return e.formatWith(user1.username, user2.username);
});
