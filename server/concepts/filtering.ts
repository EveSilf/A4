import { Posting } from "../app";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface FilterDoc extends BaseDoc {
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
  async add(filterName: string) {
    // Check if the filter already exists
    const existingFilter = await this.filters.readOne({ name: filterName });
    if (existingFilter) throw new NotAllowedError("Filter already exists!");

    // Add new filter to collection
    const _id = await this.filters.createOne({ name: filterName });
    return { msg: "Filter added!", _id, name: filterName };
  }

  /**
   * remove: remove a filter into the filters collection.
   */
  async remove(filterName: string) {
    // Check if the filter exists
    const existingFilter = await this.filters.readOne({ name: filterName });
    if (!existingFilter) throw new NotFoundError("Filter does not exist!");

    // Remove the filter from the collection
    await this.filters.deleteOne({ name: filterName });
    return { msg: "Filter removed successfully!", name: filterName };
  }

  async filter(filterNames: string[]) {
    // Retrieve all posts and filter them based on the tags
    const FilteredPosts = await Posting.posts.readMany({ tags: { $in: filterNames } });
    return FilteredPosts;
  }
}
