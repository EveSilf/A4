import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";
export interface QuizDoc extends BaseDoc {
  author: ObjectId;
  question: string;
  options: string[];
  answer: string;
  tags: string[];
}

export default class QuizzingConcept {
  public readonly quizzes: DocCollection<QuizDoc>;

  /**
   * Make an instance of quizing.
   */
  constructor(collectionName: string) {
    this.quizzes = new DocCollection<QuizDoc>(collectionName);
  }

  async create(author: ObjectId, question: string, tags: string[], options: string[], answer: string) {
    //Check if quiz already exists (Assume that the question is unique)
    const quiz = await this.quizzes.readOne({ question });
    if (quiz) throw new NotAllowedError("Quiz already exists!");

    //Create quiz
    const _id = await this.quizzes.createOne({ author, question, options, answer, tags });
    return { msg: "quiz created!", quiz: await this.quizzes.readOne({ _id }) };
  }

  async getByAuthor(author: ObjectId) {
    return await this.quizzes.readMany({ author });
  }

  async modifyQuiz(_id: ObjectId, question?: string, tags?: string[], options?: string[], answer?: string) {
    // Check if quiz exists
    const quiz = await this.quizzes.readOne({ _id });
    if (!quiz) throw new NotAllowedError("Quiz doesn't exist!");

    // Update quiz fields if provided
    if (question !== undefined) quiz.question = question;
    if (tags !== undefined) quiz.tags = tags;
    if (options !== undefined) quiz.options = options;
    if (answer !== undefined) quiz.answer = answer;

    await this.quizzes.replaceOne({ _id }, quiz);
    return { msg: "Quiz updated!", quiz: await this.quizzes.readOne({ _id }) };
  }

  async delete(_id: ObjectId) {
    const quiz = await this.quizzes.readOne({ _id });
    if (!quiz) throw new NotAllowedError("Quiz doesn't exist!");
    await this.quizzes.deleteOne({ _id });
    return { msg: "deleted quiz!" };
  }

  async getQuizzes() {
    return await this.quizzes.readMany({});
  }

  async assertAuthorIsUser(_id: ObjectId, user: ObjectId) {
    const group = await this.quizzes.readOne({ _id });
    if (!group) {
      throw new NotFoundError(`Quiz ${_id} does not exist!`);
    }
    if (group.author.toString() !== user.toString()) {
      throw new QuizAuthorNotMatchError(user, _id);
    }
  }
}

export class QuizAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the author of quiz {1}!", author, _id);
  }
}
