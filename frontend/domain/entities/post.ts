export type PostCategory = "자유" | "조합공유" | "질문";

export interface Post {
  id: number;
  userId: string;
  authorNickname: string;
  authorProfileImage: string;
  category: PostCategory;
  title: string;
  content: string;
  commentCount: number;
  createdAt: string;
}

export interface Comment {
  id: number;
  postId: number;
  userId: string;
  authorNickname: string;
  authorProfileImage: string;
  content: string;
  createdAt: string;
}
