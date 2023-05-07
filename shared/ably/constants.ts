
export enum Channels {
    Gatherings = "gatherings",
    Shareables = "shareables",
    Members = "members",
    Contributions = "contributions",
}

export enum Events {
    GatheringScheduled = "gathering:scheduled",
    GatheringStart = "gathering:start",
    GatheringEnd = "gathering:end",
    ShareableCreated = "shareable:created",
    PullRequestMerged = "contributions:pullrequest:merged",
}