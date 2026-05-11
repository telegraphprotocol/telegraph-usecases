import { XPostDetails } from "../types";

export interface XPostProvider {
  fetchPostDetails(url: string): Promise<XPostDetails>;
}
