class Account {

    email: string;
    password: string;
    boosted = false;
    status: AccountStatus = AccountStatus.UNDEFINED;

    constructor(username: string, password: string, boosted = false, AccountsStatus: AccountStatus = AccountStatus.UNDEFINED) {
        this.email = username;
        this.password = password;
    }
}

enum AccountStatus {
    UNDEFINED = 'UNDEFINED',
    BOOSTED = 'BOOSTED',
    ACTIVE = 'ACTIVE',
    LOGIN_ERROR = 'LOGIN_ERROR',
    HARD_THROTTLED = 'HARD_THROTTLED',
}

export { Account, AccountStatus };