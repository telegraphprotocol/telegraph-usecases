import { XPostProvider } from "../providers/xPostProvider";
import { FetchMeta, XPostDetails } from "../types";

export interface PostDetailsResult {
  post: XPostDetails;
  meta: FetchMeta;
}

export class XPostService {
  constructor(
    private readonly provider: XPostProvider,
    private readonly providerName: string = "vx-twitter"
  ) {}

  async getPostDetails(url: string): Promise<PostDetailsResult> {
    const post = await this.provider.fetchPostDetails(url);

    return {
      post,
      meta: {
        fetchedAt: new Date().toISOString(),
        provider: this.providerName
      }
    };
  }
}
