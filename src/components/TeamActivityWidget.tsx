'use client';

interface TeamMember {
  id: string;
  name: string;
  activity: string;
  project?: string;
  status: 'active' | 'idle';
  lastActivity: string;
  avatar: string;
}

export function TeamActivityWidget() {
  const members: TeamMember[] = [
    {
      id: '1',
      name: 'Sarah Jenkins',
      activity: 'Editing',
      project: 'Project Charter',
      status: 'active',
      lastActivity: 'Active now',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCAjo2ciLRzN5-zvlzZeZoaRKnDqAIkDb6s5vJ2IYbApMizkfSlwtGQtzuIMepHet3MJrMgxJZCO45in885M5D10B0cw5pe7OMd1Q6Q7MTTT6rr0DD5PVdPTjcDkw4JUJZGOK7dS0YZ74XWB1JEm8UNKSsuySk5LkirupKW9LkP7_sZpjR26J7VxducK_T991uaKeSgmu-AnXsS2KK0WNMdP0NEf0b2TARdBwMpiRXl2sIqC6PEZzlIB4JxGLmM1U-1d4VQ-eogtAM',
    },
    {
      id: '2',
      name: 'Mike Chen',
      activity: 'Last action: Committed code to',
      project: 'backend/main.py',
      status: 'idle',
      lastActivity: '24m ago',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDcIxqyzGAxgaTqNQ0YwO0c_jxykUe3JBBo-8Uig_UL6Y-Sw-RY6-qkQO5JSbe0fmhlj4uEcz2ZU90EgFUz83ro34HLJiPDYc8BY_I6OcnAcVguIC8GsHSKHaOri7vOGBTZLyzqffnVdEAp9bgeV8gQCtg_Ph7ii0uJk6K6MffsXXdgj8hqihMNXMit4vziXr-YtXVFoFIB-MyV3u1khJSU45IqHb2Xc0a_p__9fnruPCTqGTKXZEBoS5ZV4ZIe3ufNCzjz-u3ggJk',
    },
    {
      id: '3',
      name: 'Elena Rodriguez',
      activity: 'Reviewing',
      project: 'Wireframes v2',
      status: 'active',
      lastActivity: 'Active now',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAZ4rcMwNsBWOStd_I99cC5gyOfucCMQZ5oGdoLTmPR2iuirXv0ud_QgyYt5t0-tALMhcLv0mZhIswZP0jNCxYZ53yqQsK5NUlIu5WauhSXvt_ZHEb0PTLWkouc7iIZS5jkkPs6pOqJNAydbrDUbPwD7hH8v24nyKfhoFMHw_zVTCSMQ4KeWmsrFz7iJcjAa8ApvVqih-w1mY9_5_a50Yl-BYlUYrNHxJRt80YLC_PTL5VAohh0PoZsCXWKkOJ3ipQzZXN4E_oaTvU',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#f0f2f4] shadow-sm p-6">
      <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
        Team Activity
        <span className="size-2 bg-green-500 rounded-full animate-pulse"></span>
      </h3>
      <div className="space-y-6">
        {members.map((member) => (
          <div key={member.id} className="flex items-start gap-3">
            <div className="relative">
              <div className="size-10 rounded-full bg-cover border-2 border-white" style={{ backgroundImage: `url("${member.avatar}")` }}></div>
              <div className={`absolute bottom-0 right-0 size-3 border-2 border-white rounded-full ${member.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            </div>
            <div>
              <p className="text-sm font-bold">{member.name}</p>
              <p className="text-xs text-[#657386]">
                {member.activity}{' '}
                {member.project && <span className="text-primary font-medium">{member.project}</span>}
              </p>
              <p className="text-[10px] text-[#a0aec0] mt-1">{member.lastActivity}</p>
            </div>
          </div>
        ))}
      </div>
      <button className="w-full mt-8 py-2 rounded-lg border border-[#f0f2f4] text-xs font-bold hover:bg-[#fafafa] transition-colors">
        View Full Team Overview
      </button>
    </div>
  );
}
