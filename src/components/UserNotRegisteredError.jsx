import UnauthorizedState from '@/components/shared/UnauthorizedState';

const UserNotRegisteredError = () => {
  return (
    <UnauthorizedState
      title="Account access unavailable"
      description="This account is not registered for On The Run Electrics. Sign in with a different account or contact the workshop for help."
      actionTo="/login"
      actionLabel="Return to sign in"
    />
  );
};

export default UserNotRegisteredError;
