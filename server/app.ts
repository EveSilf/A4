import AuthenticatingConcept from "./concepts/authenticating";
import FilteringConcept from "./concepts/filtering";
import FriendingConcept from "./concepts/friending";
import GroupingConcept from "./concepts/grouping";
import PostingConcept from "./concepts/posting";
import QuizzingConcept from "./concepts/quizzing";
import SessioningConcept from "./concepts/sessioning";

// The app is a composition of concepts instantiated here
// and synchronized together in `routes.ts`.
export const Sessioning = new SessioningConcept();
export const Authing = new AuthenticatingConcept("users");
export const Posting = new PostingConcept("posts");
export const Friending = new FriendingConcept("friends");
export const Grouping = new GroupingConcept("groups");
export const Filtering = new FilteringConcept("filters");
export const Quizzing = new QuizzingConcept("quizzes");
