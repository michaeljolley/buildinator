
const ORBIT_API_KEY = Deno.env.get("ORBIT_API_KEY");
const ORBIT_WORKSPACE = Deno.env.get("ORBIT_WORKSPACE");
const ORBIT_BASE_API_URL = 'https://app.orbit.love/api/v1';

export const membersSlug = `${ORBIT_BASE_API_URL}/${ORBIT_WORKSPACE}/members`;
export const activitiesSlug = `${ORBIT_BASE_API_URL}/${ORBIT_WORKSPACE}/activities`;

export const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ORBIT_API_KEY}`
}