import { OrbitIdentity } from "./index.ts";

export type OrbitMember = {
    data: {
        id: string,
        type: string,
        attributes: {
            avatar_url?: string;
            bio?: string;
            birthday?: string;
            company?: string;
            title?: null,
            created_at: string;
            deleted_at?: string;
            location?: string;
            name: string;
            pronouns?: string;
            reach: number;
            shipping_address?: string;
            slug: string;
            source: string;
            tag_list: string[];
            tags: string[];
            teammate: boolean;
            tshirt?: string;
            updated_at: string;
            merged_at: string;
            url?: string;
            orbit_url: string;
            created: boolean;
            id: string;
            orbit_level: number;
            love: number;
            first_activity_occurred_at?: string;
            last_activity_occurred_at?: string;
            activities_count: number;
            activities_score: 798,
            twitter?: string;
            github?: string;
            discourse?: string;
            email?: string;
            devto?: string;
            linkedin?: string;
            discord?: string;
            github_followers?: number;
            twitter_followers?: number;
            topics: string[];
            languages: string[];
        },
        relationships: {
            identities: {
                data: [
                    {
                        id: string;
                        type: string;
                    }
                ]
            }
        }
    },
    included: [
        {
            id: string;
            type: string;
            attributes: OrbitIdentity;
        }
    ]
}