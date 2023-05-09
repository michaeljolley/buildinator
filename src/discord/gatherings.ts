const BUILD_WITH_ME_DISCORD_EVENT_COVER_IMAGE = "https://res.cloudinary.com/dk3rdh3yo/image/upload/v1683497900/discord_brew_with_me_cover.png";

// export async function gatheringStartHandler(bot: Bot, message: Types.Message) {
//     console.log("Received: " + message.data);
// }

// export async function gatheringEndHandler(bot: Bot, message: Types.Message) {
//     console.log("Received: " + message.data);
// }


function brewWithMeImage() {
    fetch(BUILD_WITH_ME_DISCORD_EVENT_COVER_IMAGE)
        .then((res) => res.blob())
        .then((blob) => {
            // Read the Blob as DataURL using the FileReader API
            const reader = new FileReader();
            reader.onloadend = () => {
                return reader.result;
            };
            reader.readAsDataURL(blob);
        });
}
