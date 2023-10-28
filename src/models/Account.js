class Account {
    email;
    password;
    boosted = false;
    constructor(username, password) {
        this.email = username;
        this.password = password;
    }
}
var AccountStatus;
(function (AccountStatus) {
    AccountStatus["BOOSTED"] = "BOOSTED";
    AccountStatus["ACTIVE"] = "ACTIVE";
    AccountStatus["HARD_THROTTLED"] = "HARD_THROTTLED";
})(AccountStatus || (AccountStatus = {}));
export { Account, AccountStatus };
