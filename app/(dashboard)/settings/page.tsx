"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { getApiUrl, logout } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "sonner";
import {
  Save,
  LogOut,
  User,
  Mail,
  Lock,
  Shield,
  Globe,
  Smartphone,
  Key,
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout: logoutStore } = useAuthStore();
  const [apiUrl, setApiUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Form States (Placeholders)
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [emailForm, setEmailForm] = useState(user?.email || "");
  const [nameForm, setNameForm] = useState(user?.name || "");

  useEffect(() => {
    setApiUrl(getApiUrl());
    if (user) {
      setEmailForm(user.email);
      setNameForm(user.name);
    }
  }, [user]);

  const handlePlaceholderSave = (action: string) => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      toast.success(`${action} updated successfully (Placeholder)`);
      // Reset sensitive fields
      setPasswords({ current: "", new: "", confirm: "" });
    }, 1000);
  };

  const handleLogout = async () => {
    await logout();
    logoutStore();
    toast.success("Logged out successfully");
    router.push("/login");
  };

  return (
    <div className="space-y-8 max-w-[1000px] mx-auto animate-in fade-in duration-500 pb-10">
      {/* HEADER */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Account Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your profile details, security preferences, and system
          configuration.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_250px]">
        {/* LEFT COLUMN: Main Forms */}
        <div className="space-y-6">
          {/* 1. GENERAL INFORMATION */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle>General Information</CardTitle>
              </div>
              <CardDescription>
                Update your public display name and contact email.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Display Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={nameForm}
                    onChange={(e) => setNameForm(e.target.value)}
                    className="pl-9"
                    placeholder="Your Name"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={emailForm}
                    onChange={(e) => setEmailForm(e.target.value)}
                    className="pl-9"
                    placeholder="name@example.com"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/20 px-6 py-4">
              <Button
                onClick={() => handlePlaceholderSave("Profile")}
                disabled={isLoading}
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>

          {/* 2. SECURITY (PASSWORD) */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle>Security</CardTitle>
              </div>
              <CardDescription>
                Manage your password and authentication methods.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="current-pass">Current Password</Label>
                <Input
                  id="current-pass"
                  type="password"
                  value={passwords.current}
                  onChange={(e) =>
                    setPasswords({ ...passwords, current: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="new-pass">New Password</Label>
                  <Input
                    id="new-pass"
                    type="password"
                    value={passwords.new}
                    onChange={(e) =>
                      setPasswords({ ...passwords, new: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm-pass">Confirm Password</Label>
                  <Input
                    id="confirm-pass"
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) =>
                      setPasswords({ ...passwords, confirm: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/20 px-6 py-4 flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                Password must be at least 8 characters long.
              </p>
              <Button
                variant="outline"
                onClick={() => handlePlaceholderSave("Password")}
                disabled={isLoading}
              >
                Update Password
              </Button>
            </CardFooter>
          </Card>

          {/* 3. SYSTEM CONFIG */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <CardTitle>System Configuration</CardTitle>
              </div>
              <CardDescription>
                Connection settings for the backend API.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="api-url">Backend API URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="api-url"
                    value={apiUrl}
                    readOnly
                    className="bg-muted font-mono text-sm"
                  />
                  <Button
                    variant="secondary"
                    onClick={() =>
                      toast.info(
                        "Configuration is managed via environment variables."
                      )
                    }
                  >
                    Check Status
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  This value is set via{" "}
                  <code className="bg-muted px-1 rounded">
                    NEXT_PUBLIC_API_URL
                  </code>
                  .
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Sidebar / Info */}
        <div className="space-y-6">
          {/* Profile Summary */}
          <Card className="bg-muted/30 border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Profile Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {user?.name?.charAt(0) || "U"}
                </div>
                <div className="overflow-hidden">
                  <p className="font-medium truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Shield className="h-3 w-3" /> Role
                  </span>
                  <span className="font-medium">Administrator</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session */}
          <Card className="border-rose-200 bg-rose-50/50 dark:bg-rose-950/10 dark:border-rose-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-rose-600 dark:text-rose-400">
                Session
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">
                Sign out of your account on this device.
              </p>
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
