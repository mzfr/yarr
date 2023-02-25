from time import sleep

import requests

CONSUMER_KEY = ""
API_URL = "https://getpocket.com/v3/oauth/{}"

headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "charset": "UTF-8",
    "X-Accept": "application/x-www-form-urlencoded",
}


r = requests.post(
    API_URL.format("request"),
    data={"consumer_key": CONSUMER_KEY, "redirect_uri": "https://google.com"},
)

if r.status_code == 200 and r:
    code = r.content.decode("utf-8").split("=")[-1]

    print("Please visit the link and authorize the application")

    auth_link = "https://getpocket.com/auth/authorize?request_token={}&redirect_uri=https://google.com".format(
        code
    )
    print(auth_link)

    sleep(10)

    re = requests.post(
        API_URL.format("authorize"),
        data={"consumer_key": CONSUMER_KEY, "code": code},
        headers=headers,
    )

    if re.status_code == 200:
        print(
            "Access Token is: ", re.content.decode("utf-8").split("&")[0].split("=")[-1]
        )
