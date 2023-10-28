class Account {
    email;
    password;
    boosted = false;
    status = AccountStatus.UNDEFINED;
    constructor(username, password, boosted = false, AccountsStatus = AccountStatus.UNDEFINED) {
        this.email = username;
        this.password = password;
    }
}
var AccountStatus;
(function (AccountStatus) {
    AccountStatus["UNDEFINED"] = "UNDEFINED";
    AccountStatus["BOOSTED"] = "BOOSTED";
    AccountStatus["ACTIVE"] = "ACTIVE";
    AccountStatus["LOGIN_ERROR"] = "LOGIN_ERROR";
    AccountStatus["HARD_THROTTLED"] = "HARD_THROTTLED";
})(AccountStatus || (AccountStatus = {}));
export { Account, AccountStatus };
