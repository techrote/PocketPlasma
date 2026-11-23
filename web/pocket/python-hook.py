# Appended to the staged, NEVER upstream, plasma.py. Transient offsets only.
_original_effective_energy=BrowserRuntime._effective_energy_values

def _pocket_set_motion(self,x,y,twist,magnitude):
    values=(x,y,twist,magnitude)
    if not all(isinstance(v,(int,float)) and math.isfinite(v) and -1<=v<=1 for v in values):
        raise ValueError('invalid PocketPlasma motion')
    self.pocket_motion=tuple(float(v) for v in values)

def _pocket_effective_energy(self,elapsed):
    values=_original_effective_energy(self,elapsed)
    x,y,twist,magnitude=getattr(self,'pocket_motion',(0.0,0.0,0.0,0.0))
    values['fx']+=0.14*x
    values['fy']+=0.14*y
    values['hue_shift']+=28.0*twist
    values['rad']+=0.035*magnitude
    values['speed']+=0.16*twist
    return values

BrowserRuntime.pocket_set_motion=_pocket_set_motion
BrowserRuntime._effective_energy_values=_pocket_effective_energy
