-- Stays open in the background and checks for new label print lists every 10 seconds.
-- Being its own app means macOS asks once to let it into the Desktop folder, where Sorella lives.
on idle
	try
		do shell script "/usr/bin/python3 " & quoted form of "HELPER_PATH"
	end try
	return 10
end idle
