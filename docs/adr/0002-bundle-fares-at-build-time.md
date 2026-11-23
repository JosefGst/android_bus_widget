# Bundle Fares at build time from the hk-bus-crawling data

KMB's API has no fare endpoint, and the MTR open dataset covers only MTR rail and MTR Bus. So Fares come from the daily JSON published by hkbus/hk-bus-crawling (GPL-2.0). A script trims it to KMB Routes and the result is committed; the app never fetches the 8 MB all-operator file at runtime. A monthly CI job reruns the same script and opens a PR when the file changes, and fails instead if the data looks broken (fare and Stop counts disagree, or the KMB Route count drops more than 10%).

Consequence: Fares can be out of date until the next app release after a fare change. Runtime fetching was rejected for the download size and for making the app depend on a third-party host being up.
