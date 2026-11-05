export type Session = {
	user: { id: string; name: string; email: string };
	store: { name: string };
};

export type SignInInput = { email: string; password: string };

export type ChangePasswordInput = {
	currentPassword: string;
	newPassword: string;
};
