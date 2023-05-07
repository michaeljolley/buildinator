import * as queryString from "https://deno.land/x/querystring@v1.0.2/mod.js";

import { activitiesSlug, headers, membersSlug } from "./constants.ts";
import { OrbitIdentity } from "./orbitIdentity.ts";
import { OrbitActivity } from "./orbityActivity.ts";
import { OrbitMember } from "./orbitMember.ts";

export async function addMember(identity: OrbitIdentity) {
    try {
        const response = await fetch(membersSlug, {
            method: 'POST',
            headers,
            body: JSON.stringify(identity)
        });
        const data = await response.json();
        return data;
    }
    catch (error) {
        console.error(`ORBIT: addMember: ${error}`);
    }
}

export async function getMember(identity: OrbitIdentity): Promise<OrbitMember | undefined> {
    try {
        const queryParams = queryString.stringify(identity)
        const response = await fetch(`${membersSlug}/find?${queryParams}`, {
            method: 'GET',
            headers
        });
        const data = await response.json();
        return data as OrbitMember;
    }
    catch (error) {
        console.error(`ORBIT: getMember: ${error}`);
    }
}

export async function addContentActivity(url: string, identity: OrbitIdentity) {
    try {
        const response = await fetch(activitiesSlug, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                activity: {
                    url,
                    activity_type: 'content'
                },
                identity
            })
        });
        const data = await response.json();
        return data;
    }
    catch (error) {
        console.error(`ORBIT: addContentActivity: ${error}`);
    }
}

export async function addActivity(activity: OrbitActivity, identity: OrbitIdentity) {
    try {
        const response = await fetch(activitiesSlug, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                activity,
                identity
            })
        });
        const data = await response.json();
        return data;
    }
    catch (error) {
        console.error(`ORBIT: addActivity: ${error}`);
    }
}

export type {
    OrbitActivity,
    OrbitIdentity,
    OrbitMember
}