import 'package:flutter/material.dart';
import 'screens/dashboard_screen.dart';
import 'screens/skill_mesh_screen.dart';
import 'screens/sandbox_screen.dart';

void main() {
  runApp(const SahAiApp());
}

class SahAiApp extends StatelessWidget {
  const SahAiApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SahAI Cognitive Suite',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        primaryColor: const Color(0xFF0F172A),
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        colorScheme: const ColorScheme.dark(
          primary: Colors.emeraldAccent,
          secondary: Colors.emerald,
          surface: Color(0xFF1E293B),
          background: Color(0xFF0F172A),
        ),
        fontFamily: 'Inter',
        useMaterial3: true,
      ),
      home: const MainAppShell(),
    );
  }
}

class MainAppShell extends StatefulWidget {
  const MainAppShell({super.key});

  @override
  State<MainAppShell> createState() => _MainAppShellState();
}

class _MainAppShellState extends State<MainAppShell> {
  int _selectedIndex = 0;
  
  // Set default student ID to sync with our database seeding and E2E integration test runs
  final String _userId = 'd5d9c4fc-90f9-4c0d-8d09-8bc8a9b23b1c';

  late final List<Widget> _screens;

  @override
  void initState() {
    super.initState();
    _screens = [
      DashboardScreen(
        userId: _userId,
        onStartSandbox: () {
          setState(() {
            _selectedIndex = 2; // Jump to coding sandbox tab
          });
        },
      ),
      SkillMeshScreen(userId: _userId),
      SandboxScreen(userId: _userId),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _selectedIndex,
        children: _screens,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          border: Border(top: BorderSide(color: Colors.slate[900]!, width: 1)),
        ),
        child: BottomNavigationBar(
          backgroundColor: const Color(0xFF0F172A),
          selectedItemColor: Colors.emeraldAccent,
          unselectedItemColor: Colors.slate[600],
          currentIndex: _selectedIndex,
          type: BottomNavigationBarType.fixed,
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
          unselectedLabelStyle: const TextStyle(fontSize: 11),
          onTap: (index) {
            setState(() {
              _selectedIndex = index;
            });
          },
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_rounded),
              activeIcon: Icon(Icons.dashboard_rounded, color: Colors.emeraldAccent),
              label: 'Hub',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.account_tree_outlined),
              activeIcon: Icon(Icons.account_tree_rounded, color: Colors.emeraldAccent),
              label: 'Skill Mesh',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.terminal_rounded),
              activeIcon: Icon(Icons.terminal_rounded, color: Colors.emeraldAccent),
              label: 'Sandbox',
            ),
          ],
        ),
      ),
    );
  }
}
