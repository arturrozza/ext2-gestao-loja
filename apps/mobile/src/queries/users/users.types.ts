export type User = {
	id: string;
	name: string;
	email: string;
	/** Deactivated users can't sign in and show up apart in the list. */
	active: boolean;
};

export type NewUserInput = { name: string; email: string; password: string };
