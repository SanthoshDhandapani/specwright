import React, { useState } from "react";

export interface AuthFields {
  userEmail: string;
  userName: string;
  userPicture: string;
  storageKey: string;
  signinPath: string;
  buttonTestId: string;
  postLoginUrl: string;
  password: string;
}

export const EMPTY_AUTH: AuthFields = {
  userEmail: "", userName: "", userPicture: "",
  storageKey: "", signinPath: "", buttonTestId: "", postLoginUrl: "",
  password: "",
};

export function isOAuthConfigured(f: AuthFields): boolean {
  return !!f.userEmail && !!(f.storageKey || f.buttonTestId);
}

export function isEmailPasswordConfigured(f: AuthFields): boolean {
  return !!f.userEmail && !!f.password;
}

export function AuthSettingsModal({
  strategy,
  initial,
  onSave,
  onClose,
}: {
  strategy: string;
  initial: AuthFields;
  onSave: (fields: AuthFields) => void;
  onClose: () => void;
}): React.JSX.Element {
  const [fields, setFields] = useState<AuthFields>(initial);
  const set = (k: keyof AuthFields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((p) => ({ ...p, [k]: e.target.value }));

  const isOAuth = strategy === "oauth";
  const canSave = isOAuth ? isOAuthConfigured(fields) : isEmailPasswordConfigured(fields);

  const inputCls = (required: boolean, val: string) =>
    `w-full bg-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 border focus:outline-none focus:border-brand-500 placeholder-slate-600 ${
      required && !val ? "border-red-500/60" : "border-slate-600"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-[360px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h2 className="text-slate-200 text-sm font-semibold">
            {isOAuth ? "OAuth" : "Email + Password"} Settings
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-sm">✕</button>
        </div>

        <div className="px-4 py-3 space-y-4">
          <div className="space-y-2">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">User Identity</p>

            <div>
              <label className="block text-slate-400 text-xs mb-1">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={fields.userEmail}
                onChange={set("userEmail")}
                placeholder="user@example.com"
                className={inputCls(true, fields.userEmail)}
              />
            </div>

            {isOAuth && (
              <>
                <div>
                  <label className="block text-slate-400 text-xs mb-1">
                    Display Name <span className="text-slate-600">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={fields.userName}
                    onChange={set("userName")}
                    placeholder="Derived from email if blank"
                    className={inputCls(false, fields.userName)}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-xs mb-1">
                    Picture URL <span className="text-slate-600">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={fields.userPicture}
                    onChange={set("userPicture")}
                    placeholder="SVG initials auto-generated if blank"
                    className={inputCls(false, fields.userPicture)}
                  />
                </div>
              </>
            )}

            {!isOAuth && (
              <div>
                <label className="block text-slate-400 text-xs mb-1">
                  Password <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={fields.password}
                  onChange={set("password")}
                  placeholder="••••••••"
                  className={inputCls(true, fields.password)}
                />
              </div>
            )}
          </div>

          {isOAuth && (
            <div className="space-y-2">
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">
                Auth Mechanism <span className="text-slate-600 normal-case">(one required)</span>
              </p>

              <div>
                <label className="block text-slate-400 text-xs mb-1">
                  Storage Key
                  {!fields.buttonTestId && <span className="text-red-400"> *</span>}
                </label>
                <input
                  type="text"
                  value={fields.storageKey}
                  onChange={set("storageKey")}
                  placeholder="localStorage key (e.g. app-auth-user)"
                  className={inputCls(!fields.buttonTestId, fields.storageKey)}
                />
                <p className="text-slate-600 text-xs mt-0.5">Inject auth directly — no popup needed</p>
              </div>

              <div className="flex items-center gap-2">
                <hr className="flex-1 border-slate-700" />
                <span className="text-slate-600 text-xs">or</span>
                <hr className="flex-1 border-slate-700" />
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">
                  Sign-in Button Test ID
                  {!fields.storageKey && <span className="text-red-400"> *</span>}
                </label>
                <input
                  type="text"
                  value={fields.buttonTestId}
                  onChange={set("buttonTestId")}
                  placeholder="google-signin-button"
                  className={inputCls(!fields.storageKey, fields.buttonTestId)}
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">
                  Sign-in Path <span className="text-slate-600">(optional)</span>
                </label>
                <input
                  type="text"
                  value={fields.signinPath}
                  onChange={set("signinPath")}
                  placeholder="/signin"
                  className={inputCls(false, fields.signinPath)}
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">
                  Post-login URL <span className="text-slate-600">(optional)</span>
                </label>
                <input
                  type="text"
                  value={fields.postLoginUrl}
                  onChange={set("postLoginUrl")}
                  placeholder="**/"
                  className={inputCls(false, fields.postLoginUrl)}
                />
              </div>
            </div>
          )}

          {!canSave && (
            <p className="text-red-400/80 text-xs">
              {isOAuth
                ? "Email and at least one auth mechanism (Storage Key or Button Test ID) are required."
                : "Email and password are required."}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-700">
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-xs px-3 py-1.5 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => canSave && onSave(fields)}
            disabled={!canSave}
            className="text-xs px-4 py-1.5 rounded font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-brand-600 hover:bg-brand-500 text-white"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
