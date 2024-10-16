import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface FilterDoc extends BaseDoc {
  author: ObjectId;
  name: string;
}

/**
 * concept: Filtering[Posts]
 */
export default class FilteringConcept {
  public readonly filters: DocCollection<FilterDoc>;

  /**
   * Make an instance of Filtering.
   */
  constructor(collectionName: string) {
    this.filters = new DocCollection<FilterDoc>(collectionName);
  }

  /**
   * add: add a filter into the filters collection.
   */
  async add(userId: ObjectId, filterName: string) {
    // Check if the filter already exists
    const existingFilter = await this.filters.readOne({ name: filterName });
    if (existingFilter) throw new FilterAlreadyExistsError(filterName);

    // Add new filter to collection
    const _id = await this.filters.createOne({ author: userId, name: filterName });
    return { msg: "Filter added!", _id, name: filterName };
  }

  /**
   * remove: remove a filter into the filters collection.
   */
  async remove(userId: ObjectId, filterName: string) {
    // Check if the filter exists
    const existingFilter = await this.filters.readOne({ name: filterName });
    if (!existingFilter) throw new FilterNotFoundError(filterName);

    // Remove the filter from the collection
    await this.filters.deleteOne({ author: userId, name: filterName });
    return { msg: "Filter removed successfully!", name: filterName };
  }

  /**
   * filter: filter based on the provided tags.
   */
  async filter(filterList: string[], tags: string[]) {
    // Filter items that contain any of the filter names in their tags
    return filterList.some((filter) => tags.includes(filter));
  }

  async getFilters() {
    // Returns all filters! You might want to page for better client performance
    return await this.filters.readMany({}, { sort: { _id: -1 } });
  }

  async getByAuthor(author: ObjectId) {
    return await this.filters.readMany({ author });
  }
}

export class FilterAlreadyExistsError extends NotAllowedError {
  constructor(public readonly name: string) {
    super(`Filter "${name}" already exists!`);
  }
}

export class FilterNotFoundError extends NotFoundError {
  constructor(public readonly name: string) {
    super(`Filter "${name}" does not exist!`);
  }
}
