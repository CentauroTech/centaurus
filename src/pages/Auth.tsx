import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import centaurusLogo from '@/assets/centaurus-logo.jpeg';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { ROLE_TYPES, ROLE_LABELS, RoleType } from '@/hooks/useTeamMemberRoles';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.string().min(1, 'Please select a role'),
});

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const passwordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Helper to generate initials from name
function generateInitials(firstName: string, lastName: string): string {
  return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
}

// Helper to generate a random color
function generateColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 50%)`;
}

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleType | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingReset, setIsCheckingReset] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  
  // Password reset flow
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    // Listen for auth state changes to detect password recovery
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }
    });

    // Check URL hash for recovery token (backup method)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.get('type') === 'recovery') {
      setIsPasswordRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && !loading && !isPasswordRecovery && !isCheckingReset) {
      navigate('/');
    }
  }, [user, loading, navigate, isPasswordRecovery, isCheckingReset]);

  const handleLogin = async () => {
    try {
      const validation = loginSchema.safeParse({ email, password });
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      setIsSubmitting(true);
      setIsCheckingReset(true); // Block useEffect redirect during check

      const { error } = await signIn(email, password);
      if (error) {
        setIsCheckingReset(false);
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password');
        } else {
          toast.error(error.message);
        }
      } else {
        // Check if user needs to reset password (provisioned by admin)
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser?.user_metadata?.must_reset_password) {
          setIsPasswordRecovery(true);
          setIsCheckingReset(false);
          toast.info('Please set a new password to continue.');
          setIsSubmitting(false);
          return;
        }
        setIsCheckingReset(false);
        toast.success('Welcome back!');
        // Navigation will happen via useEffect
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async () => {
    try {
      const validation = signupSchema.safeParse({ 
        firstName, 
        lastName, 
        email, 
        password, 
        role: selectedRole 
      });
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      setIsSubmitting(true);

      // Create the auth user with metadata - the database trigger will handle team_member creation
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            role_type: selectedRole,
          }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          toast.error('This email is already registered. Try logging in instead.');
        } else {
          toast.error(signUpError.message);
        }
        return;
      }

      toast.success('Account created successfully!');
      navigate('/');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    const validation = emailSchema.safeParse({ email: resetEmail });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Password reset email sent! Check your inbox.');
        setForgotPasswordOpen(false);
        setResetEmail('');
      }
    } finally {
      setIsResetting(false);
    }
  };

  const handleUpdatePassword = async () => {
    const validation = passwordSchema.safeParse({ password: newPassword, confirmPassword });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ 
        password: newPassword,
        data: { must_reset_password: false },
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Password updated successfully! Please log in with your new password.');
        setIsPasswordRecovery(false);
        setNewPassword('');
        setConfirmPassword('');
        // Clear the URL hash
        window.history.replaceState(null, '', window.location.pathname);
        // Sign out so they log in fresh with the new password
        await supabase.auth.signOut();
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Password recovery form
  if (isPasswordRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar-bg to-background p-4">
        <Card className="w-full max-w-md shadow-xl border-border/50">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-2">
              <img src={centaurusLogo} alt="Centaurus Logo" className="h-16 w-16 rounded-xl object-cover" />
            </div>
            <CardTitle className="text-2xl font-display">Centaurus</CardTitle>
            <CardDescription>Reset your password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdatePassword()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdatePassword()}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleUpdatePassword}
              disabled={isUpdatingPassword}
            >
              {isUpdatingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar-bg to-background p-4">
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <img src={centaurusLogo} alt="Centaurus Logo" className="h-16 w-16 rounded-xl object-cover" />
          </div>
          <CardTitle className="text-2xl font-display">Centaurus</CardTitle>
          <CardDescription>Sign in to access your boards and tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password">Password</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setForgotPasswordOpen(true);
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleLogin}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="signup-firstname">First Name</Label>
                  <Input
                    id="signup-firstname"
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-lastname">Last Name</Label>
                  <Input
                    id="signup-lastname"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-role">Role</Label>
                <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as RoleType)}>
                  <SelectTrigger id="signup-role">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_TYPES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={handleSignup}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="you@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleForgotPassword()}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleForgotPassword}
              disabled={isResetting}
            >
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
