export interface AuthTokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  issued_at?: string;
}

export interface PasswordLoginInput {
  tenant_name: string;
  username: string;
  password: string;
}

export interface PasswordLoginRequest extends PasswordLoginInput {
  idempotency_key: string;
}

export interface CompleteOidcLoginInput {
  state: string;
  code: string;
  redirect_uri: string;
}

export interface CompleteOidcLoginRequest extends CompleteOidcLoginInput {
  idempotency_key: string;
}

export interface LogoutInput {
  jti: string;
}

export interface LogoutRequest extends LogoutInput {
  idempotency_key: string;
}

export interface RevokeStatusResponse {
  status: "revoked";
}
